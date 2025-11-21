// Firebase configuration - NEVER commit actual keys to Git!
// These values should be set in your environment or build configuration
const firebaseConfig = {
    apiKey: window.FIREBASE_API_KEY || "YOUR_API_KEY_HERE",
    authDomain: window.FIREBASE_AUTH_DOMAIN || "artstudio-cms.firebaseapp.com",
    projectId: window.FIREBASE_PROJECT_ID || "artstudio-cms",
    storageBucket: window.FIREBASE_STORAGE_BUCKET || "artstudio-cms.firebasestorage.app",
    messagingSenderId: window.FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID_HERE",
    appId: window.FIREBASE_APP_ID || "YOUR_APP_ID_HERE"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Firebase에서 제품 데이터 로드
async function loadProductsFromFirebase() {
    try {
        console.log('Firebase에서 product_metadata 컬렉션 조회 시작...');
        
        // product_metadata 컬렉션에서 데이터 가져오기
        const metadataSnapshot = await db.collection('product_metadata').get();
        const products = [];
        
        console.log(`product_metadata 컬렉션에서 ${metadataSnapshot.size}개의 문서 발견`);
        
        metadataSnapshot.forEach(doc => {
            const data = doc.data();
            console.log('문서 데이터:', doc.id, data);

            // 썸네일과 이미지 분리 처리
            const thumbnailUrl = data.thumbnailUrl;  // 왼쪽 패널 표시용
            const images = data.images || [];  // 캔버스에 추가할 이미지들

            // 썸네일이나 이미지가 하나라도 있어야 표시
            if (thumbnailUrl || images.length > 0) {
                // categories 배열 생성 (카테고리1 필수, 카테고리2 선택)
                const categories = [];

                if (data.category1) {
                    categories.push(data.category1);
                }
                if (data.category2) {
                    categories.push(data.category2);
                }

                // keywords 배열 생성 (CMS에서 입력한 키워드만)
                const keywords = data.keywords
                    ? (Array.isArray(data.keywords)
                        ? data.keywords
                        : data.keywords.split(',').map(k => k.trim()).filter(k => k))
                    : [];

                // tags 배열 생성 (필터링용 - 모든 카테고리 값 파싱)
                const tags = [];

                // 카테고리 파싱하여 tags에 추가
                categories.forEach(category => {
                    tags.push(category.toLowerCase());  // 전체 값 (예: "비즈-가로펀칭")

                    if (category.includes('-')) {
                        const parts = category.split('-');
                        tags.push(parts[0].toLowerCase());  // 대분류 (예: "비즈")
                        if (parts[1]) {
                            tags.push(parts[1].toLowerCase());  // 세부분류 (예: "가로펀칭")
                        }
                    } else {
                        tags.push(category.toLowerCase());
                    }
                });

                // 방향 태그 추가
                if (data.direction) {
                    tags.push(data.direction.toLowerCase());
                }

                // 색상 태그 추가
                if (data.colors) {
                    const colorArray = Array.isArray(data.colors)
                        ? data.colors.map(c => c.trim().toLowerCase()).filter(c => c)
                        : data.colors.split(',').map(c => c.trim().toLowerCase()).filter(c => c);
                    tags.push(...colorArray);
                }

                // 키워드도 tags에 추가 (검색용)
                keywords.forEach(keyword => {
                    tags.push(keyword.toLowerCase());
                });

                // 중복 제거
                const uniqueTags = [...new Set(tags)];

                // type은 category1의 대분류 (하위 호환성)
                let mainType = '비즈';  // 기본값
                if (data.category1) {
                    mainType = data.category1.includes('-')
                        ? data.category1.split('-')[0]
                        : data.category1;
                }

                const productItem = {
                    id: doc.id,
                    name: data.productName || `상품 ${data.productNo}`,  // Cafe24 상품명
                    productName: data.productName || '',  // Cafe24 상품명 (원본)
                    productCode: data.productCode || '',  // Cafe24 상품코드
                    displayInfo: data.displayInfo || '',  // 선택된 아이템 메타정보 (예: "20개입")

                    // 이미지 구분
                    thumbnail: thumbnailUrl,  // 왼쪽 패널 표시용 썸네일
                    src: images.length > 0 ? images[0].url : thumbnailUrl,  // 캔버스 기본 이미지
                    images: images,  // 캔버스에 추가 가능한 전체 이미지 배열

                    type: mainType,  // 하위 호환성 유지
                    categories: categories,  // 카테고리 배열 (1~2개)
                    keywords: keywords,  // 키워드 배열 (CMS 입력값)
                    direction: data.direction || null,
                    color: data.colors
                        ? (Array.isArray(data.colors) ? data.colors[0] : data.colors.split(',')[0].trim())
                        : null,
                    size: {
                        width_mm: data.sizeInMM || 20,
                        height_mm: data.sizeInMM || 20
                    },
                    tags: uniqueTags,  // 필터링용 통합 태그
                    popularity: Math.floor(Math.random() * 100)
                };

                products.push(productItem);
                console.log('제품 추가:', productItem);
            } else {
                console.log('이미지 없는 제품 스킵:', doc.id);
            }
        });
        
        console.log('Firebase에서 제품 로드 완료:', products.length, '개');
        return products;
    } catch (error) {
        console.error('Firebase 제품 로드 실패:', error);
        return [];
    }
}

// Firebase에서 배경 데이터 로드
async function loadBackgroundsFromFirebase() {
    try {
        const backgroundsSnapshot = await db.collection('backgrounds').get();
        const backgrounds = [];
        
        backgroundsSnapshot.forEach(doc => {
            const data = doc.data();
            // CMS에서 저장한 필드명에 맞게 수정
            const imageUrl = data.url || data.imageUrl;
            const displayName = data.displayName || data.name;
            const category = data.category || data.type;
            
            backgrounds.push({
                id: doc.id,
                name: displayName,
                src: imageUrl,
                category: category
            });
        });
        
        console.log('Firebase에서 배경 로드:', backgrounds.length, '개');
        return backgrounds;
    } catch (error) {
        console.error('Firebase 배경 로드 실패:', error);
        return [];
    }
}

// 전역 변수로 내보내기
window.loadProductsFromFirebase = loadProductsFromFirebase;
window.loadBackgroundsFromFirebase = loadBackgroundsFromFirebase;