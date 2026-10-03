# ViewMix Ambient Studio

GIF, animated WebP 또는 MP4를 YouTube 데스크톱 스타일의 장면으로 합성하고, 업로드한 음악을 포함한 H.264/AAC MP4로 내보내는 로컬 웹앱입니다. 미디어 파일은 브라우저 밖으로 전송되지 않습니다.

## 실행

Node.js 22.13 이상이 필요합니다.

```powershell
npm install
npm run dev
```

브라우저에서 http://127.0.0.1:5173/ 을 엽니다.

## 주요 기능

- GIF, animated WebP, MP4 프레임 디코딩
- PNG/JPEG/WebP 다중 레이어
- 현재 프레임 기반 Ambient Light
- 음악 offset, fade, loop/silence
- H.264/AAC MP4 렌더링 및 결과 검증

## 브라우저

H.264/AAC WebCodecs 인코딩을 지원하는 최신 Chrome 또는 Edge를 권장합니다.
