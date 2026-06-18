# 数论基础

## GCD 与 LCM

```cpp
// 辗转相除法
int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

int lcm(int a, int b) {
    return a / gcd(a, b) * b; // 先除防溢出
}
```

## 质数判断与筛法

### 质数判断 O(√n)

```cpp
bool isPrime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) return false;
    }
    return true;
}
```

### 埃氏筛 O(n log log n)

```cpp
const int MAXN = 1000010;
bool notPrime[MAXN];

void sieve(int n) {
    notPrime[0] = notPrime[1] = true;
    for (int i = 2; i * i <= n; i++) {
        if (!notPrime[i]) {
            for (int j = i * i; j <= n; j += i)
                notPrime[j] = true;
        }
    }
}
```

### 线性筛（欧拉筛）O(n)

```cpp
int primes[MAXN], cnt;
bool notPrime[MAXN];

void eulerSieve(int n) {
    for (int i = 2; i <= n; i++) {
        if (!notPrime[i]) primes[cnt++] = i;
        for (int j = 0; j < cnt && i * primes[j] <= n; j++) {
            notPrime[i * primes[j]] = true;
            if (i % primes[j] == 0) break; // 关键！
        }
    }
}
```

## 快速幂

```cpp
long long quickPow(long long base, long long exp, long long mod) {
    long long result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        base = base * base % mod;
        exp >>= 1;
    }
    return result;
}
```

## 质因数分解

```cpp
vector<pair<int,int>> factorize(int n) {
    vector<pair<int,int>> factors;
    for (int i = 2; i * i <= n; i++) {
        if (n % i == 0) {
            int cnt = 0;
            while (n % i == 0) { n /= i; cnt++; }
            factors.push_back({i, cnt});
        }
    }
    if (n > 1) factors.push_back({n, 1});
    return factors;
}
```

## 取模运算规则

```
(a + b) % p = (a%p + b%p) % p
(a - b) % p = (a%p - b%p + p) % p
(a * b) % p = (a%p * b%p) % p
(a / b) % p = (a * b⁻¹) % p  ← 需要逆元
```

## 常见错误
- 快速幂忘记取模
- `(a * b) % p` 中间乘法溢出 → 用 `__int128` 或快速乘
- 线性筛 `break` 条件遗漏
- 负数取模结果为负 → 加 mod 再取模
