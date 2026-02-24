'use client';

/**
 * PostForm — 블로그 글 작성/수정 공통 폼 컴포넌트
 *
 * 작성 페이지와 수정 페이지 모두에서 재사용됩니다.
 * initialValues가 있으면 수정 모드로, 없으면 작성 모드로 동작합니다.
 */

import { useState } from 'react';
import Link from 'next/link';
import styles from './PostForm.module.css';
import type { PostBody } from '@/services/posts.service';

interface PostFormProps {
    /** 폼 제목 (예: "글 작성" | "글 수정") */
    title: string;
    /** 수정 모드에서 전달하는 초기 데이터 */
    initialValues?: PostBody;
    /** 제출 중 여부 (외부 뮤테이션 상태) */
    isSubmitting?: boolean;
    /** 제출 실패 에러 메시지 */
    submitError?: string;
    /** 폼 제출 콜백 */
    onSubmit: (values: PostBody) => void;
    /** 취소 시 돌아갈 경로 */
    cancelHref: string;
}

export default function PostForm({
    title,
    initialValues,
    isSubmitting = false,
    submitError,
    onSubmit,
    cancelHref,
}: PostFormProps) {
    /* 폼 필드 상태 */
    const [postTitle, setPostTitle] = useState(initialValues?.title ?? '');
    const [description, setDescription] = useState(initialValues?.description ?? '');
    const [content, setContent] = useState(initialValues?.content ?? '');
    /* 태그는 쉼표 구분 문자열로 입력받아 배열로 변환 */
    const [tagsInput, setTagsInput] = useState(initialValues?.tags.join(', ') ?? '');
    const [validationError, setValidationError] = useState('');

    /** 제출 핸들러 */
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setValidationError('');

        /* 기본 유효성 검사 */
        if (!postTitle.trim()) {
            setValidationError('제목을 입력해주세요.');
            return;
        }
        if (!content.trim()) {
            setValidationError('본문을 입력해주세요.');
            return;
        }

        /* 태그 파싱: 쉼표 구분, 공백 제거, 빈 값 제외 */
        const tags = tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        onSubmit({
            title: postTitle.trim(),
            description: description.trim(),
            content: content.trim(),
            tags,
        });
    };

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>{title}</h1>

            <form className={styles.form} onSubmit={handleSubmit}>
                {/* 제목 */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="post-title">제목</label>
                    <input
                        id="post-title"
                        className={styles.input}
                        type="text"
                        placeholder="글 제목을 입력하세요"
                        value={postTitle}
                        onChange={(e) => setPostTitle(e.target.value)}
                    />
                </div>

                {/* 간단한 설명 */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="post-desc">설명</label>
                    <input
                        id="post-desc"
                        className={styles.input}
                        type="text"
                        placeholder="목록에 표시되는 짧은 설명"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>

                {/* 태그 */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="post-tags">태그</label>
                    <input
                        id="post-tags"
                        className={styles.input}
                        type="text"
                        placeholder="React, TypeScript, Next.js"
                        value={tagsInput}
                        onChange={(e) => setTagsInput(e.target.value)}
                    />
                    <span className={styles.hint}>쉼표로 구분하여 입력하세요.</span>
                </div>

                {/* 본문 (Markdown) */}
                <div className={styles.field}>
                    <label className={styles.label} htmlFor="post-content">본문 (Markdown)</label>
                    <textarea
                        id="post-content"
                        className={styles.textarea}
                        placeholder="# 제목&#10;&#10;본문을 작성하세요..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                    />
                </div>

                {/* 유효성 에러 */}
                {(validationError || submitError) && (
                    <p className={styles.error}>{validationError || submitError}</p>
                )}

                {/* 액션 버튼 */}
                <div className={styles.actions}>
                    <Link href={cancelHref} className={styles.cancelBtn}>
                        취소
                    </Link>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? '저장 중...' : '저장'}
                    </button>
                </div>
            </form>
        </div>
    );
}
