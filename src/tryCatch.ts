type Success<T> = {
    data: T;
    error: null;
  };
  
  type Failure<E> = {
    data: null;
    error: E;
  };
  
  type Result<T, E = Error> = Success<T> | Failure<E>;
  
  export function tryCatch<T, E = Error>(
    promise: Promise<T>,
  ): Promise<Result<T, E>>;
  export function tryCatch<T, E = Error>(fn: () => T): Result<T, E>;
  
  export function tryCatch<T, E = Error>(
    promiseOrFn: Promise<T> | (() => T),
  ): Promise<Result<T, E>> | Result<T, E> {
    if (promiseOrFn instanceof Promise) {
      return (async () => {
        try {
          const data = await promiseOrFn;
          return {data, error: null};
        } catch (error) {
          return {data: null, error: error as E};
        }
      })();
    } else if (typeof promiseOrFn === 'function') {
      try {
        const data = promiseOrFn();
        return {data, error: null};
      } catch (error) {
        return {data: null, error: error as E};
      }
    } else {
      throw new Error(
        'Invalid argument passed to tryCatch. Expected a Promise or a function.',
      );
    }
  }
  