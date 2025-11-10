# Naru Portfolio (Dev)

로컬 개발용 간단한 포트폴리오 + 데모 API 서버

## 빠른 시작
1. 노드 모듈 설치

```powershell
npm install
```

2. 서버 시작

```powershell
npm start
```

3. 브라우저에서 열기

http://localhost:3000/index.html

## 기능 요약
- 정적 파일 제공
- `/api/reviews` GET/POST: `data/review.json`을 읽고 씁니다.
- 메인 페이지에서 개인작/샘플 갤러리, 후기 노출
- 라이트박스(썸네일 클릭시 이미지 확대)
- 후기 작성 모달: 서버에 POST(오프라인일 경우 localStorage에 임시 저장)
- 커미션 신청 폼(데모): `commission.html`에서 localStorage에 저장

## 주의
- 이 서버는 개발용입니다. 실제 운영 시에는 인증, 입력 검증, CORS, 파일 권한 등을 강화하세요.
- `data/review.json` 파일은 서버에서 쓰기 작업이 발생합니다. 실 배포 시 백업을 고려하세요.

## 이메일 알림 설정 (커미션)

커미션 신청을 이메일로 받고 싶다면 SMTP 환경변수를 설정하세요. 예시(PowerShell):

```powershell
$env:SMTP_HOST = 'smtp.example.com'
$env:SMTP_PORT = '587'
$env:SMTP_USER = 'user@example.com'
$env:SMTP_PASS = 'password'
$env:COMMISSION_RECEIVER = 'me@myemail.com'
npm start
```

환경변수가 설정되어 있으면 서버는 `/api/commissions`로 들어온 신청을 저장한 뒤 `COMMISSION_RECEIVER`로 메일을 발송하려 시도합니다.

### 정적 호스팅에서 사용: Formspree

정적 호스팅(naru 등)을 사용하실 경우 서버 없이도 Formspree를 통해 폼 제출을 이메일로 받을 수 있습니다.

1. https://formspree.io 에서 계정 생성 후 새 폼을 만드세요.
2. 제공되는 endpoint(예: `https://formspree.io/f/xxxxx`)를 `commission.html`의 `<form id="commission-form" data-formspree-endpoint="">` 안의 `data-formspree-endpoint` 값으로 붙여넣으세요.
3. 제출하면 Formspree가 해당 폼을 이메일로 포워딩합니다.

참고: Formspree 무료 플랜에는 제한이 있을 수 있으니 요건에 맞게 선택하세요.
