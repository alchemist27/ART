import { isAuthenticated } from './utils/auth.js';
import { router } from './router.js';

// 앱 초기화
const app = document.getElementById('app');

// 인증 체크 및 라우팅
const checkAuthAndRoute = () => {
    const currentPath = window.location.pathname;
    
    if (isAuthenticated()) {
        // 로그인 상태
        if (currentPath === '/' || currentPath === '/login') {
            router.navigate('/products');
        } else {
            router.render(currentPath);
        }
    } else {
        // 로그아웃 상태 - 로그인 페이지로 리다이렉트
        if (currentPath !== '/login') {
            router.navigate('/login');
        } else {
            router.render('/login');
        }
    }
};

// 초기 라우팅
checkAuthAndRoute();

// 뒤로가기/앞으로가기 처리
window.addEventListener('popstate', checkAuthAndRoute);

// router를 전역에서 사용할 수 있도록 설정
window.router = router;