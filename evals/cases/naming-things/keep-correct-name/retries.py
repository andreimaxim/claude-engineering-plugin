import time


class TransientError(Exception):
    pass


def send_with_backoff(send, message, max_attempts=3, sleep=time.sleep):
    attempt = 0
    while True:
        attempt += 1
        try:
            return send(message)
        except TransientError:
            if attempt >= max_attempts:
                raise
            sleep(2 ** attempt)
