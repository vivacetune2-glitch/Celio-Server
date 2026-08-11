import { Session } from "./session.js";
import { nanoid } from "nanoid";
import { Result } from "true-myth";
import { ok, err } from "true-myth/result";
import { Client } from "./client.js";
import { take } from "rxjs";

enum ErrorType {
    NotFound = "Session not found",
    AlreadyExists = "Session already exists",
    SessionFull = "Session is full",
}

interface SessionState {
    id: string;
    code: string;
    full: boolean;
}

export class SessionManager {

    private sessions: Map<string, Session> = new Map();
    private sessionCodes: Map<string, string> = new Map();
    private clientToSession: Map<Client, string> = new Map();

    createSession(client: Client): Result<SessionState, ErrorType> {
        if (this.clientToSession.has(client)) {
            return err(ErrorType.AlreadyExists);
        }

        // 内部用セッションID
        const sessionId: string = nanoid();

        // ユーザー表示用4桁コード
        let sessionCode: string;

        do {
            sessionCode = Math.floor(Math.random() * 10000)
                .toString()
                .padStart(4, "0");
        } while (this.sessionCodes.has(sessionCode));

        const session = new Session(
            sessionId,
            sessionCode
        );

        session.close$
            .pipe(take(1))
            .subscribe((closingSession: Session) => {
                console.log(
                    "Session " +
                    closingSession.id() +
                    " emitted closing event"
                );

                this.deleteSession(closingSession);
            });

        this.sessions.set(sessionId, session);
        this.sessionCodes.set(sessionCode, sessionId);

        return this.enterSession(client, sessionId);
    }

    enterSessionByCode(
        client: Client,
        sessionCode: string
    ): Result<SessionState, ErrorType> {

        const session = this.sessions.get(sessionCode);

        if (!session) {
            console.warn(
                'Client ' +
                client.id() +
                ' tried to join session with code ' +
                sessionCode +
                ' which does not exist'
            );

            return err(ErrorType.NotFound);
        }

        return this.enterSession(client, sessionCode);
    }

    enterSession(
        client: Client,
        sessionId: string
    ): Result<SessionState, ErrorType> {

        const session = this.sessions.get(sessionId);

        if (!session) {
            console.warn(
                'Client ' +
                client.id() +
                ' tried to join session with id ' +
                sessionId +
                ' which does not exist'
            );

            return err(ErrorType.NotFound);
        }

        if (session.isFull()) {
            console.warn(
                'Client ' +
                client.id() +
                ' tried to join session with id ' +
                sessionId +
                ' which is full'
            );

            return err(ErrorType.SessionFull);
        }

        this.clientToSession.set(client, sessionId);

        session.enter(client);

        return ok({
            id: session.id(),
            code: session.code(),
            full: session.isFull()
        });
    }

    leaveSession(client: Client) {

        if (!this.clientToSession.has(client)) {
            console.warn(
                'Client ' +
                client.id() +
                ' tried to leave session but was not in one'
            );
            return;
        }

        const sessionId = this.clientToSession.get(client)!;
        const session = this.sessions.get(sessionId);

        if (!session) {
            console.warn(
                'Client ' +
                client.id() +
                ' tried to leave session but session was not found'
            );
            return;
        }

        session.leave(client);
    }

    private deleteSession(session: Session) {

        for (const [client, id] of this.clientToSession) {
            if (id === session.id()) {
                this.clientToSession.delete(client);
            }
        }

        const result = this.sessions.delete(session.id());

        if (result) {
            console.log(
                'Session deleted with id: ' +
                session.id()
            );
        }
        else {
            console.warn(
                'Session with id could not be deleted because id ' +
                session.id() +
                ' was not found'
            );
        }
    }
}