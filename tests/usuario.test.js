function soma(a, b) {
  return a + b;
}

test('deve somar 2 + 3 e retornar 5', () => {
  expect(soma(2, 3)).toBe(5);
});
