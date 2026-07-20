export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  onTimeout?: () => void | Promise<void>,
  message = `RabbitMQ operation timed out after ${ms}ms`,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;

  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(async () => {
      try {
        await onTimeout?.();
      } finally {
        reject(new Error(message));
      }
    }, ms);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}
