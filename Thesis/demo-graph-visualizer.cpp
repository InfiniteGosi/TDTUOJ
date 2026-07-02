// ============================================================================
//  DEMO — Visualizer (C++)  |  Thuật toán: DFS trên đồ thị (adjacency matrix)
// ----------------------------------------------------------------------------
//  Dán nguyên file này vào code editor của một problem, chọn ngôn ngữ C++,
//  bấm nút VISUALIZE. Không cần chỉnh gì.
//
//  Trong bảng visualizer sẽ hiện các biến sau (renderer tự chọn theo dữ liệu):
//    • g        → GRAPH   (đồ thị 6 đỉnh, vô hướng) — không hề có class Graph
//                          trong code, hệ thống suy ra từ ma trận kề 0/1 đối xứng
//    • stack_   → STACK   (đẩy/lấy cùng một đầu → suy ra hành vi stack)
//    • visited  → ARRAY   (mảng boolean, tô đỉnh đã thăm)
//    • order    → ARRAY   (thứ tự duyệt DFS)
//    • u, v, i  → scalar strip (cập nhật theo từng bước)
//
//  Lời thoại gợi ý khi quay:
//    "Đây là DFS lặp trên đồ thị lưu bằng ma trận kề. Điểm mấu chốt: trong mã
//     nguồn KHÔNG có kiểu dữ liệu 'đồ thị' — chỉ là vector<vector<int>>. Hệ
//     thống trace giá trị lúc chạy, rồi suy ra hình dạng: g là đồ thị, stack_
//     là ngăn xếp. Tua từng bước để thấy đỉnh current sáng lên, cạnh active
//     nhấp nháy, và stack push/pop theo đúng thuật toán."
//
//  Đầu ra chuẩn: "0 1 3 5 4 2"  (thứ tự DFS từ đỉnh 0)
// ============================================================================

#include <iostream>
#include <vector>
using namespace std;

int main() {
    // Đồ thị vô hướng, 6 đỉnh — ma trận kề đối xứng (0/1).
    // Cạnh: 0-1, 0-2, 1-3, 2-3, 2-4, 3-5, 4-5
    vector<vector<int>> g = {
        {0, 1, 1, 0, 0, 0},
        {1, 0, 0, 1, 0, 0},
        {1, 0, 0, 1, 1, 0},
        {0, 1, 1, 0, 0, 1},
        {0, 0, 1, 0, 0, 1},
        {0, 0, 0, 1, 1, 0},
    };
    int n = (int)g.size();

    vector<bool> visited(n, false);
    vector<int> stack_;          // ngăn xếp tường minh (push_back / pop_back)
    vector<int> order;           // thứ tự duyệt

    stack_.push_back(0);         // bắt đầu DFS từ đỉnh 0
    while (!stack_.empty()) {
        int u = stack_.back();
        stack_.pop_back();
        if (visited[u]) continue;
        visited[u] = true;
        order.push_back(u);

        // đẩy các đỉnh kề chưa thăm (duyệt ngược để lấy thứ tự tăng dần)
        for (int v = n - 1; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) {
                stack_.push_back(v);
            }
        }
    }

    for (int i = 0; i < (int)order.size(); i++) {
        cout << order[i];
        if (i + 1 < (int)order.size()) cout << " ";
    }
    cout << "\n";
    return 0;
}
