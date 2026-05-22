export function execFileSync() {
  throw new Error("브라우저 번들에서는 child_process를 사용할 수 없습니다.");
}
