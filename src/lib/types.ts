export type Category = 'multiplication' | 'addition' | 'divisibility';

export type Problem = {
  text: string;
  ans: number | string | boolean;
  type: string;
};
