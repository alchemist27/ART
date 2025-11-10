import { db } from '../config/firebase.js';
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    deleteDoc,
    updateDoc,
    query,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

class BackgroundCategoryService {
    constructor() {
        this.collectionName = 'background_categories';
    }

    /**
     * Get all background categories
     */
    async getCategories() {
        try {
            const q = query(
                collection(db, this.collectionName),
                orderBy('order', 'asc')
            );

            const querySnapshot = await getDocs(q);
            const categories = [];

            querySnapshot.forEach((doc) => {
                categories.push({
                    ...doc.data(),
                    id: doc.id
                });
            });

            return categories;
        } catch (error) {
            // If orderBy fails due to index not created yet, fallback to simple query
            console.log('Falling back to simple query without ordering');

            const querySnapshot = await getDocs(collection(db, this.collectionName));
            const categories = [];

            querySnapshot.forEach((doc) => {
                categories.push({
                    ...doc.data(),
                    id: doc.id
                });
            });

            // Sort manually by order
            categories.sort((a, b) => (a.order || 0) - (b.order || 0));

            return categories;
        }
    }

    /**
     * Get a single category by ID
     */
    async getCategory(categoryId) {
        try {
            const docRef = doc(db, this.collectionName, categoryId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return {
                    ...docSnap.data(),
                    id: docSnap.id
                };
            } else {
                return null;
            }
        } catch (error) {
            console.error('Error getting category:', error);
            throw error;
        }
    }

    /**
     * Create a new background category
     */
    async createCategory(categoryData) {
        try {
            // Generate unique ID
            const categoryId = `cat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Get current max order
            const categories = await this.getCategories();
            const maxOrder = categories.length > 0
                ? Math.max(...categories.map(c => c.order || 0))
                : 0;

            const newCategory = {
                id: categoryId,
                name: categoryData.name,
                displayName: categoryData.displayName || categoryData.name,
                description: categoryData.description || '',
                order: maxOrder + 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            const docRef = doc(db, this.collectionName, categoryId);
            await setDoc(docRef, newCategory);

            console.log('Category created successfully:', categoryId);
            return newCategory;
        } catch (error) {
            console.error('Error creating category:', error);
            throw error;
        }
    }

    /**
     * Update a category
     */
    async updateCategory(categoryId, updates) {
        try {
            const docRef = doc(db, this.collectionName, categoryId);

            const updateData = {
                ...updates,
                updatedAt: serverTimestamp()
            };

            await updateDoc(docRef, updateData);

            console.log('Category updated successfully:', categoryId);
            return true;
        } catch (error) {
            console.error('Error updating category:', error);
            throw error;
        }
    }

    /**
     * Delete a category
     */
    async deleteCategory(categoryId) {
        try {
            const docRef = doc(db, this.collectionName, categoryId);
            await deleteDoc(docRef);

            console.log('Category deleted successfully:', categoryId);
            return true;
        } catch (error) {
            console.error('Error deleting category:', error);
            throw error;
        }
    }

    /**
     * Reorder categories
     */
    async reorderCategories(categoryIds) {
        try {
            const updatePromises = categoryIds.map((id, index) => {
                const docRef = doc(db, this.collectionName, id);
                return updateDoc(docRef, {
                    order: index + 1,
                    updatedAt: serverTimestamp()
                });
            });

            await Promise.all(updatePromises);

            console.log('Categories reordered successfully');
            return true;
        } catch (error) {
            console.error('Error reordering categories:', error);
            throw error;
        }
    }

    /**
     * Initialize default categories (run once)
     */
    async initializeDefaultCategories() {
        try {
            const existingCategories = await this.getCategories();

            if (existingCategories.length > 0) {
                console.log('Categories already exist, skipping initialization');
                return existingCategories;
            }

            const defaultCategories = [
                { name: '기본배경', displayName: '기본배경', order: 1 },
                { name: '키링', displayName: '키링', order: 2 },
                { name: '스트랩', displayName: '스트랩', order: 3 },
                { name: '모루인형', displayName: '모루인형', order: 4 },
                { name: '비녀/뒤꽂이', displayName: '비녀/뒤꽂이', order: 5 },
                { name: '팔찌', displayName: '팔찌', order: 6 },
                { name: '목걸이', displayName: '목걸이', order: 7 },
                { name: '반지', displayName: '반지', order: 8 },
                { name: '귀걸이', displayName: '귀걸이', order: 9 },
                { name: '데코덴 케이스', displayName: '데코덴 케이스', order: 10 },
                { name: '스마트톡', displayName: '스마트톡', order: 11 }
            ];

            const createPromises = defaultCategories.map(cat =>
                this.createCategory(cat)
            );

            const results = await Promise.all(createPromises);
            console.log('Default categories initialized:', results.length);

            return results;
        } catch (error) {
            console.error('Error initializing default categories:', error);
            throw error;
        }
    }
}

export const backgroundCategoryService = new BackgroundCategoryService();
