import type { Metadata } from 'next';
import GifMakerClient from './GifMakerClient';

export const metadata: Metadata = {
    title: 'GIF 변환기',
};

export default function GifMakerPage() {
    return <GifMakerClient />;
}
