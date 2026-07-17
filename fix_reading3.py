#!/usr/bin/env python3
import re

with open('web/src/data/cspS.js', 'r', encoding='utf-8') as f:
    content = f.read()

# The correct code with proper line numbers 01-99
correct_code = r"""```cpp\n01 #include <iostream>\n02 #include <queue>\n03 using namespace std;\n04 \n05 const int maxl = 20000000;\n06 \n07 class Map {\n08     struct item {\n09         string key; int value;\n10     } d[maxl];\n11     int cnt;\n12   public:\n13     int find(string x) {\n14         for (int i = 0; i < cnt; ++i)\n15             if (d[i].key == x)\n16                 return d[i].value;\n17         return -1;\n18     }\n19     static int end() { return -1; }\n20     void insert(string k, int v) {\n21         d[cnt].key = k; d[cnt++].value = v;\n22     }\n23 } s[2];\n24 \n25 class Queue {\n26     string q[maxl];\n27     int head, tail;\n28   public:\n29     void pop() { ++head; }\n30     string front() { return q[head + 1]; }\n31     bool empty() { return head == tail; }\n32     void push(string x) { q[++tail] = x;  }\n33 } q[2];\n34 \n35 string st0, st1;\n36 int m;\n37 \n38 string LtoR(string s, int L, int R) {\n39     string t = s;\n40     char tmp = t[L];\n41     for (int i = L; i < R; ++i)\n42         t[i] = t[i + 1];\n43     t[R] = tmp;\n44     return t;\n45 }\n46 \n47 string RtoL(string s, int L, int R) {\n48     string t = s;\n49     char tmp = t[R];\n50     for (int i = R; i > L; --i)\n51         t[i] = t[i - 1];\n52     t[L] = tmp;\n53     return t;\n54 }\n55 \n56 bool check(string st, int p, int step) {\n57     if (s[p].find(st) != s[p].end())\n58         return false;\n59     ++step;\n60     if (s[p ^ 1].find(st) == s[p].end()) {\n61         s[p].insert(st, step);\n62         q[p].push(st);\n63         return false;\n64     }\n65     cout << s[p ^ 1].find(st) + step << endl;\n66     return true;\n67 }\n68 \n69 int main() {\n70     cin >> st0 >> st1;\n71     int len = st0.length();\n72     if (len != st1.length()) {\n73         cout << -1 << endl;\n74         return 0;\n75     }\n76     if (st0 == st1) {\n77         cout << 0 << endl;\n78         return 0;\n79     }\n80     cin >> m;\n81     s[0].insert(st0, 0); s[1].insert(st1, 0);\n82     q[0].push(st0); q[1].push(st1);\n83     for (int p = 0;\n84             !(q[0].empty() && q[1].empty());\n85             p ^= 1) {\n86         string st = q[p].front(); q[p].pop();\n87         int step = s[p].find(st);\n88         if ((p == 0 &&\n89                 (check(LtoR(st, m, len - 1), p, step) ||\n90                  check(RtoL(st, 0, m), p, step)))\n91                         ||\n92                 (p == 1 &&\n93                  (check(LtoR(st, 0, m), p, step) ||\n94                   check(RtoL(st, m, len - 1), p, step))))\n95             return 0;\n96     }\n97     cout << -1 << endl;\n98     return 0;\n99 }\n\n```\n\n完成下面的判断题和单选题："""

# Find the statement field for reading question 3 (2020-reading-3)
# It starts with "statement": "```cpp\n01 #include <iostream>...
pattern = r'"statement": "```cpp\\n01 #include <iostream>.*?```\\n\\n完成下面的判断题和单选题："'

match = re.search(pattern, content, re.DOTALL)
if match:
    old_statement = match.group(0)
    new_statement = '"statement": "' + correct_code + '"'
    content = content.replace(old_statement, new_statement)
    print("Fixed statement line numbers (01-99)")
else:
    print("Could not find statement pattern")

with open('web/src/data/cspS.js', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done!")
