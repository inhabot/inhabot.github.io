import * as CFB from "cfb";

export function createRequire() {
  return (specifier) => {
    if (specifier === "cfb") {
      return CFB;
    }

    throw new Error(`브라우저 번들에서 지원하지 않는 require 호출입니다: ${specifier}`);
  };
}
