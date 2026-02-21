import session from 'express-session';

// 세션 저장소 (메모리 스토어)
const sessionStore = new session.MemoryStore();

// 세션 미들웨어 설정
export const sessionConfig = session({
    secret: process.env.SESSION_SECRET || 'default_secret_key',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    store: sessionStore,
    cookie: {
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000, // 24시간
    },
});

export { sessionStore };
