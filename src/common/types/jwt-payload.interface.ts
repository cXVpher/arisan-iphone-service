export interface JwtPayload {
  sub: number;
  username: string;
  role: 'member' | 'admin';
}
