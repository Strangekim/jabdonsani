# ARL 미리보기 연동

- 진입 페이지: <https://jobdongsani.co.kr/arl>
- 소스: 비공개 `Strangekim/AcousticRealityLab`의 main.
- 이 저장소는 ARL 소스 전체를 보관하지 않고, 탭·진입 화면과 빌드 결과 수신 기능을 제공한다.

## 동작

ARL의 `.github/workflows/preview.yml`이 웹 파일을 빌드한 뒤 GitHub OIDC 토큰으로 `/api/arl-preview/deployments`에 인증한다. 파일을 최대 512 KiB씩 전송하고, 수신 서버는 크기·SHA-256을 확인한 후 상태 포인터를 교체한다. 불완전한 전송은 현재 미리보기에 영향을 주지 않는다.

웹 파일은 Docker named volume `arl-preview`의 `/app/arl-preview-data`에 저장된다. 이후 ARL 업데이트는 이 사이트의 이미지를 재빌드하지 않는다. 기존 Nginx `/api/` 프록시를 그대로 사용한다.

## 운영 정보

- `GET /api/arl-preview/status`: 첫 배포 전 `ready:false`, 배포 후 SHA·배포 시각·미리보기 URL·Actions URL. 캐시하지 않는다.
- `GET /api/arl-preview/releases/<sha>-<run>-<attempt>/index.html`: 버전별 정적 미리보기. WASM은 `application/wasm`으로 제공한다.
- 업로드 인증: GitHub issuer/audience/서명·기한 및 고정 repository ID·owner ID·main·workflow 경로·event·subject를 확인한다. 설정은 `backend/arl-preview/auth.ts`에 있다.
- 데이터 제한: 최대 256개 파일, 총 128 MiB. 경로·확장자 allowlist, 전체 무결성 검증. tar/zip 추출이나 셸 실행은 없다.
- 최근 릴리스 3개를 유지한다. 이전 페이지에서 파일이 없으면 `/arl`에서 최신 버전을 다시 연다.
- 뒤늦게 끝난 과거 실행은 최신 버전을 덮어쓸 수 없다. 되돌리기는 ARL main에 revert 커밋을 push한다.
- 새 미리보기는 공개된다. 원본 저장소 비공개와 별개이며, 기밀 도면·실측 데이터 공개 용도로 사용하지 않는다.
- 일반 배포에서 Docker 볼륨을 지우지 않는다. `docker-compose down -v`는 미리보기와 다른 데이터 볼륨도 삭제할 수 있다.

OIDC 토큰은 GitHub Actions의 deploy 작업에서 매번 발급한다. ARL용 장기 SSH 키나 cross-repository PAT는 필요하지 않다. 저장소 소유권·ID·이름·워크플로 경로가 변경되면 신뢰 정책을 검토한다. 서버가 외부 GitHub JWKS에 접근할 수 있어야 한다.

수신 서버는 현재 Compose의 단일 backend 인스턴스를 전제로 한다. 여러 프로세스·서버로 확장하려면 활성화 잠금과 저장소 구조를 먼저 조정한다.

## 검증

```bash
cd backend
npm ci
npm run typecheck
npm run test:arl
```

테스트는 잘못된 토큰·저장소·브랜치, 경로 이동, 업로드 재시도, 불완전 파일·해시 불일치, 순서가 뒤집힌 배포 및 정적 응답을 확인한다. 기존 사이트 배포 workflow는 검증 후 OCI에 반영하고 공개 status API 응답을 확인한다.
