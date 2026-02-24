/* ================================================================
   블로그 게시글 서비스 — 순수 API 호출 함수 모음
   CRUD 전체를 포함합니다.
   ================================================================ */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import type { PaginatedData } from '@/types/api';
import type { PostListItem, PostDetail, PostPopularItem } from '@/types/post';

/** 블로그 목록 조회 파라미터 */
export interface GetPostsParams {
    /** 태그 필터, 미지정 시 전체 */
    tag?: string;
    /** 커서 기반 페이지네이션 커서 */
    cursor?: string;
    /** 페이지당 항목 수 (기본: 10) */
    limit?: number;
}

/** 게시글 작성/수정 본문 */
export interface PostBody {
    title: string;
    description: string;
    content: string;
    tags: string[];
}

/**
 * 블로그 목록 조회 (커서 기반 페이지네이션)
 * GET /api/posts
 */
export const getPosts = (params?: GetPostsParams) =>
    apiGet<PaginatedData<PostListItem>>('/posts', {
        tag: params?.tag || undefined,
        cursor: params?.cursor,
        limit: params?.limit ?? 10,
    });

/**
 * 블로그 글 상세 조회
 * GET /api/posts/:id
 */
export const getPost = (id: number) => apiGet<PostDetail>(`/posts/${id}`);

/**
 * 블로그 인기글 조회
 * GET /api/posts/popular
 */
export const getPopularPosts = () =>
    apiGet<PostPopularItem[]>('/posts/popular');

/**
 * 블로그 글 작성 (로그인 필요)
 * POST /api/posts
 */
export const createPost = (body: PostBody) => apiPost<PostDetail>('/posts', body);

/**
 * 블로그 글 수정 (로그인 필요)
 * PUT /api/posts/:id
 */
export const updatePost = (id: number, body: PostBody) =>
    apiPut<PostDetail>(`/posts/${id}`, body);

/**
 * 블로그 글 삭제 (로그인 필요)
 * DELETE /api/posts/:id
 */
export const deletePost = (id: number) => apiDelete<null>(`/posts/${id}`);
