# Firebase 환경 변수 설정 가이드

## 문제 상황
에디터에서 Firebase 카테고리를 로드할 때 권한 오류가 발생합니다:
```
FirebaseError: Missing or insufficient permissions
```

이는 에디터의 Firebase 환경 변수가 설정되지 않았기 때문입니다.

## 해결 방법

### 1. Vercel 환경 변수 설정

#### 에디터 프로젝트 (art-gules-six.vercel.app):

1. Vercel 대시보드 접속
2. 에디터 프로젝트 선택 (art-gules-six)
3. Settings > Environment Variables 이동
4. 다음 환경 변수 추가:

```
FIREBASE_API_KEY=<CMS와 동일한 값>
FIREBASE_AUTH_DOMAIN=artstudio-cms.firebaseapp.com
FIREBASE_PROJECT_ID=artstudio-cms
FIREBASE_STORAGE_BUCKET=artstudio-cms.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=<CMS와 동일한 값>
FIREBASE_APP_ID=<CMS와 동일한 값>
CAFE24_SHOP_ID=sugardeco
```

5. 모든 환경 (Production, Preview, Development)에 적용
6. 프로젝트 재배포

### 2. Firebase 값 확인 방법

CMS 프로젝트의 환경 변수에서 동일한 값을 복사:

1. Vercel 대시보드에서 CMS 프로젝트 (art-cms-gamma) 접속
2. Settings > Environment Variables
3. `VITE_FIREBASE_*` 값들을 확인
4. 에디터 프로젝트에는 `VITE_` 접두사 없이 설정

### 3. 빌드 스크립트 업데이트

에디터의 `vercel.json` 또는 빌드 설정에서 환경 변수를 주입하도록 설정이 필요할 수 있습니다.

현재 `env-config.js`는 다음과 같은 placeholder를 사용합니다:
```javascript
window.FIREBASE_API_KEY = '__FIREBASE_API_KEY__';
```

이 값들이 빌드 시 실제 환경 변수로 대체되어야 합니다.

## 임시 해결책

Firebase 카테고리를 로드할 수 없을 때, 에디터는 자동으로 배경 이미지의 실제 카테고리를 사용하여 드롭다운을 생성합니다.

따라서 배경 이미지만 올바르게 로드되면, 카테고리 드롭다운은 작동합니다.

## 확인 사항

1. CMS에서 배경 이미지를 업로드할 때 올바른 카테고리를 선택했는지 확인
2. CMS에서 "카테고리 초기화" 버튼을 클릭하여 기본 카테고리 생성
3. 배경 이미지의 `category` 필드가 올바르게 저장되었는지 확인

## 테스트

환경 변수 설정 후:
1. 에디터 새로고침
2. 콘솔에서 다음 로그 확인:
   - "Firebase에서 background categories 로드 완료: X개"
   - 권한 오류가 사라졌는지 확인
3. 배경 카테고리 드롭다운에 개수가 정확히 표시되는지 확인
