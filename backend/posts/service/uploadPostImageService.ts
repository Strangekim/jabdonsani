import { query } from "../../config/db";

/**
 * 게시글 이미지 업로드 처리 서비스
 * @param fileData 이미지 파일 데이터 (보통 multer 등의 객체)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadPostImageService = async (fileData: any): Promise<{ url: string }> => {
    // TODO: (추후 구현) AWS S3 연동 업로드 또는 로컬 업로드 처리
    // 현재는 더미 URL을 리턴하도록 처리
    console.log("Mock Image Upload:", fileData?.originalname);
    return { url: "https://via.placeholder.com/800x400.png?text=Mock+Image" };
};
