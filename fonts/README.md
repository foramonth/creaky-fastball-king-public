# 폰트 원본

게임에 쓰는 글꼴의 **원본 파일과 라이선스**예요. 빌드할 때 `fontpack.py`가 게임 문구에 쓰인 글자만 뽑아 HTML 안에 넣어요.
최종 HTML에는 뽑아낸 폰트만 들어가고, 이 원본 파일은 들어가지 않아요.

| 파일 | 폰트 | 라이선스 | 게임 안 이름 |
|---|---|---|---|
| `NotoSansKR[wght].ttf` | Noto Sans KR (가변, 400·700·900으로 고정해서 사용) | SIL OFL 1.1, `OFL-NotoSansKR.txt`. Copyright 2014-2021 Adobe, Reserved Font Name 'Source' | `CFK Sans` |
| `BlackHanSans-Regular.ttf` | Black Han Sans | SIL OFL 1.1, `OFL-BlackHanSans.txt`. Copyright 2015 The Black Han Sans Project Authors, Reserved Font Name 없음 | `CFK Display` |

- 출처: https://github.com/google/fonts (`ofl/notosanskr`, `ofl/blackhansans`)
- 뽑아낸 폰트는 OFL의 "수정본"이에요.
  - 예약 이름 'Source'는 쓰지 않아요.
  - 원본과 헷갈리지 않게 이름을 `CFK Sans`, `CFK Display`로 바꿔요(폰트 내부 이름도 함께).
  - 각 라이선스 전문과 저작권 줄은 HTML 안 `@font-face` 바로 위에 주석으로 함께 들어가요(OFL 조건 2).
- 빌드에 필요한 것: `pip install fonttools brotli`
- 처음 빌드는 글자 뽑기에 약 25초 걸려요. 결과는 `.fontcache/`에 저장되고, 문구가 바뀔 때만 다시 뽑아요.

## 원본 파일 확인값 (SHA-256)

원본을 새로 받거나 교체할 때, 아래 값과 비교해서 같은 파일인지 확인해요. 값이 다르면 출처와 라이선스부터 다시 확인해요.

```
194018e6b2b293a7964f037b25c0249ce1418bc9ab3c971060a03aa57861e252  NotoSansKR[wght].ttf
31960809284026681774a8e52dc19ebcad26cf69b0ad9d560f288296fbb52739  BlackHanSans-Regular.ttf
1c05c68c34f9708415aada51f17e1b0092d2cea709bf4a94cd38114f9e73d7d9  OFL-NotoSansKR.txt
c324192c8b3a988bae45a9a7e4ac1258b684739003bda114e0523423440457c9  OFL-BlackHanSans.txt
```

- 받은 곳: `https://raw.githubusercontent.com/google/fonts/main/ofl/notosanskr/`, `.../ofl/blackhansans/` (2026-11-25)
- 확인 방법: `cd fonts && sha256sum -c` 에 위 네 줄을 넣거나, `sha256sum *.ttf OFL-*.txt` 결과와 비교해요.
