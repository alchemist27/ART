/**
 * Background Category Loader - Firebase에서 배경 카테고리 로드
 */

// Firebase에서 배경 카테고리 목록 로드
async function loadBackgroundCategoriesFromFirebase() {
    try {
        console.log('Firebase에서 background_categories 컬렉션 조회 시작...');

        const querySnapshot = await db.collection('background_categories')
            .orderBy('order', 'asc')
            .get();

        const categories = [];

        querySnapshot.forEach(doc => {
            const data = doc.data();
            categories.push({
                id: doc.id,
                name: data.name,
                displayName: data.displayName || data.name,
                order: data.order || 0
            });
        });

        console.log('Firebase에서 카테고리 로드 완료:', categories.length, '개');
        return categories;
    } catch (error) {
        // orderBy 실패 시 fallback
        console.log('Falling back to simple query without ordering');

        try {
            const querySnapshot = await db.collection('background_categories').get();
            const categories = [];

            querySnapshot.forEach(doc => {
                const data = doc.data();
                categories.push({
                    id: doc.id,
                    name: data.name,
                    displayName: data.displayName || data.name,
                    order: data.order || 0
                });
            });

            // 수동으로 정렬
            categories.sort((a, b) => a.order - b.order);

            console.log('Firebase에서 카테고리 로드 완료 (정렬 수동):', categories.length, '개');
            return categories;
        } catch (fallbackError) {
            console.error('Firebase 카테고리 로드 실패:', fallbackError);
            return [];
        }
    }
}

// 전역 변수로 내보내기
window.loadBackgroundCategoriesFromFirebase = loadBackgroundCategoriesFromFirebase;
