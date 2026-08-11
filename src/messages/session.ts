export type CreateSessionMessage = {
    clientId: string;
};

export type JoinSessionMessage = {
    clientId: string;
    sessionCode: string;
};

export type LeaveSessionMessage = {
    clientId: string;
};