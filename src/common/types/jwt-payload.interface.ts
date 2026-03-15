export interface JwtPayload {
  sub: string;
  username: string;
  role: 'member' | 'admin';
}
