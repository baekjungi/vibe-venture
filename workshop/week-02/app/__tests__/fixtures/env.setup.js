"use strict";
// 테스트 실행 시 필요한 환경변수 기본값 주입
// 실제 키를 사용하지 않고 mock으로 동작하도록 설정
process.env.NEIS_API_KEY        = "test-neis-key";
process.env.NAVER_CLIENT_ID     = "test-naver-id";
process.env.NAVER_CLIENT_SECRET = "test-naver-secret";
process.env.GEMINI_API_KEY      = "test-gemini-key";
process.env.NODE_ENV            = "test";
