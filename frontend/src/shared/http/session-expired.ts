export const SESSION_EXPIRED = "grocery:session-expired";
export function notifySessionExpired(status: number) {
  if (status === 401 && typeof window !== "undefined")
    window.dispatchEvent(new Event(SESSION_EXPIRED));
}
