export type Category = 'multiplication' | 'addition' | 'divisibility' | 'fractions';

export type Problem = {
  text: string;
  ans: number | string | boolean;
  type: string;
};
