import { describe, expect, it, vi, afterEach } from "vitest";
import { BaileysRepository } from "../src/infrastructure/repositories/Baileys/BaileysRepository";
import { SessionManager } from "../src/infrastructure/repositories/SessionManager";
import type { BaileysConnector } from "../src/infrastructure/repositories/Baileys/BaileysConnector";
import type { MessageEventLogRepository } from "../src/infrastructure/repositories/MessageEventLogRepository";
import type { MessageRepository } from "../src/infrastructure/repositories/MessageRepository";
import type { IContactRepository } from "../src/domain/repositories/IContactRepository";
import type { WASocket } from "@whiskeysockets/baileys";

const SESSION_ID = "session-1";
const NUMBER = "5511999999999";
const JID = `${NUMBER}@s.whatsapp.net`;

function makeSock(opts: {
  profilePictureUrl?: string | null;
  profilePictureUrlThrows?: boolean;
} = {}) {
  const profilePictureUrl = opts.profilePictureUrlThrows
    ? vi.fn().mockRejectedValue(new Error("no picture visible"))
    : vi.fn().mockResolvedValue(opts.profilePictureUrl ?? null);

  return {
    user: { id: "session-owner@s.whatsapp.net" },
    onWhatsApp: vi.fn().mockResolvedValue([{ exists: true, jid: JID }]),
    profilePictureUrl,
  } as unknown as WASocket;
}

function makeContactRepository(
  overrides: Partial<IContactRepository> = {},
): IContactRepository {
  return {
    findByPhone: vi.fn().mockResolvedValue(null),
    upsertPhoto: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function makeFetchMock(opts: {
  downloadOk?: boolean;
  uploadOk?: boolean;
  uploadUrl?: string;
} = {}) {
  const {
    downloadOk = true,
    uploadOk = true,
    uploadUrl = "https://storage.example.com/whatsapp/contacts/photo.jpg",
  } = opts;

  return vi.fn(async (input: unknown) => {
    const url = String(input);

    if (url.includes("/storage/api/v1/file/add-item")) {
      if (!uploadOk) {
        return { ok: false, status: 500 } as Response;
      }
      return {
        ok: true,
        json: async () => ({ url: uploadUrl }),
      } as unknown as Response;
    }

    if (!downloadOk) {
      return { ok: false, status: 404 } as Response;
    }

    return {
      ok: true,
      headers: { get: () => "image/jpeg" },
      arrayBuffer: async () => new ArrayBuffer(8),
    } as unknown as Response;
  });
}

function makeRepository(opts: {
  sock: WASocket;
  contactRepository: IContactRepository;
  name?: string;
}) {
  const sessions = new SessionManager();
  sessions.set(SESSION_ID, opts.sock);

  const messageRepository = {
    getNameUserBy: vi.fn().mockResolvedValue(opts.name ?? "Fulano"),
  } as unknown as MessageRepository;

  return new BaileysRepository(
    {} as unknown as BaileysConnector,
    sessions,
    {} as unknown as MessageEventLogRepository,
    messageRepository,
    opts.contactRepository,
  );
}

describe("BaileysRepository.getContact — durable profile photo", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("5.1 first-time lookup downloads from WhatsApp, uploads to storage, persists and returns the storage URL", async () => {
    const sock = makeSock({
      profilePictureUrl: "https://pps.whatsapp.net/v/some-signed-url.jpg",
    });
    const contactRepository = makeContactRepository();
    const uploadUrl = "https://storage.example.com/whatsapp/contacts/t1/5511999999999.jpg";
    const fetchMock = makeFetchMock({ uploadUrl });
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe(uploadUrl);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(contactRepository.upsertPhoto).toHaveBeenCalledWith(
      "tenant-1",
      NUMBER,
      "Fulano",
      uploadUrl,
    );
  });

  it("5.2 repeat lookup within the TTL returns the cached URL without calling WhatsApp or storage", async () => {
    const cachedUrl = "https://storage.example.com/whatsapp/contacts/t1/cached.jpg";
    const sock = makeSock();
    const contactRepository = makeContactRepository({
      findByPhone: vi
        .fn()
        .mockResolvedValue({ url_photo: cachedUrl, photo_synced_at: new Date() }),
    });
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe(cachedUrl);
    expect(sock.profilePictureUrl).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(contactRepository.upsertPhoto).not.toHaveBeenCalled();
  });

  it("5.3 no WhatsApp picture and no cache returns an empty profilePicUrl", async () => {
    const sock = makeSock({ profilePictureUrl: null });
    const contactRepository = makeContactRepository();
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe("");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(contactRepository.upsertPhoto).not.toHaveBeenCalled();
  });

  it("5.4 storage upload failure on a first-time lookup returns empty and does not throw", async () => {
    const sock = makeSock({
      profilePictureUrl: "https://pps.whatsapp.net/v/some-signed-url.jpg",
    });
    const contactRepository = makeContactRepository();
    const fetchMock = makeFetchMock({ uploadOk: false });
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe("");
    expect(contactRepository.upsertPhoto).not.toHaveBeenCalled();
  });

  it("5.5 two tenants looking up the same phone number get independent cached/returned photo URLs", async () => {
    const sock = makeSock({
      profilePictureUrl: "https://pps.whatsapp.net/v/some-signed-url.jpg",
    });
    const contactRepository = makeContactRepository();
    const fetchMock = makeFetchMock({
      uploadUrl: "https://storage.example.com/whatsapp/contacts/shared.jpg",
    });
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    await repo.getContact(SESSION_ID, NUMBER, "tenant-1");
    await repo.getContact(SESSION_ID, NUMBER, "tenant-2");

    expect(contactRepository.findByPhone).toHaveBeenNthCalledWith(
      1,
      "tenant-1",
      NUMBER,
    );
    expect(contactRepository.findByPhone).toHaveBeenNthCalledWith(
      2,
      "tenant-2",
      NUMBER,
    );
    expect(contactRepository.upsertPhoto).toHaveBeenNthCalledWith(
      1,
      "tenant-1",
      NUMBER,
      "Fulano",
      "https://storage.example.com/whatsapp/contacts/shared.jpg",
    );
    expect(contactRepository.upsertPhoto).toHaveBeenNthCalledWith(
      2,
      "tenant-2",
      NUMBER,
      "Fulano",
      "https://storage.example.com/whatsapp/contacts/shared.jpg",
    );
  });

  it("5.6 a cached photo older than the TTL is refreshed from WhatsApp and re-cached", async () => {
    const staleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // ~100 dias
    const newUploadUrl = "https://storage.example.com/whatsapp/contacts/t1/refreshed.jpg";
    const sock = makeSock({
      profilePictureUrl: "https://pps.whatsapp.net/v/new-signed-url.jpg",
    });
    const contactRepository = makeContactRepository({
      findByPhone: vi.fn().mockResolvedValue({
        url_photo: "https://storage.example.com/whatsapp/contacts/t1/old.jpg",
        photo_synced_at: staleDate,
      }),
    });
    const fetchMock = makeFetchMock({ uploadUrl: newUploadUrl });
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe(newUploadUrl);
    expect(sock.profilePictureUrl).toHaveBeenCalled();
    expect(contactRepository.upsertPhoto).toHaveBeenCalledWith(
      "tenant-1",
      NUMBER,
      "Fulano",
      newUploadUrl,
    );
  });

  it("5.7 a failed refresh of a stale cached photo falls back to the old cached URL", async () => {
    const staleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // ~100 dias
    const oldUrl = "https://storage.example.com/whatsapp/contacts/t1/old.jpg";
    const sock = makeSock({
      profilePictureUrl: "https://pps.whatsapp.net/v/new-signed-url.jpg",
    });
    const contactRepository = makeContactRepository({
      findByPhone: vi.fn().mockResolvedValue({
        url_photo: oldUrl,
        photo_synced_at: staleDate,
      }),
    });
    const fetchMock = makeFetchMock({ uploadOk: false });
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe(oldUrl);
    expect(contactRepository.upsertPhoto).not.toHaveBeenCalled();
  });

  it("5.8 a stale cached photo whose WhatsApp picture disappeared falls back to the old cached URL", async () => {
    const staleDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000); // ~100 dias
    const oldUrl = "https://storage.example.com/whatsapp/contacts/t1/old.jpg";
    const sock = makeSock({ profilePictureUrl: null });
    const contactRepository = makeContactRepository({
      findByPhone: vi.fn().mockResolvedValue({
        url_photo: oldUrl,
        photo_synced_at: staleDate,
      }),
    });
    const fetchMock = makeFetchMock();
    vi.stubGlobal("fetch", fetchMock);

    const repo = makeRepository({ sock, contactRepository });

    const result = await repo.getContact(SESSION_ID, NUMBER, "tenant-1");

    expect(result.profilePicUrl).toBe(oldUrl);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(contactRepository.upsertPhoto).not.toHaveBeenCalled();
  });
});
