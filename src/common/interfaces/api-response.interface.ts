export interface ApiResponse<T = any> {
  status: boolean;
  code: number;
  message: string;
  data?: T;
}
