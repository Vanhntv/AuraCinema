import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const currencyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

const compactFormatter = new Intl.NumberFormat("vi-VN", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const RevenueChart = ({ data, loading = false }) => {
  if (loading) {
    return <div className="dashboard-chart-state">Đang tải biểu đồ...</div>;
  }

  if (!data.length) {
    return <div className="dashboard-chart-state">Chưa có dữ liệu doanh thu.</div>;
  }

  return (
    <div
      className="dashboard-revenue-chart"
      aria-label="Biểu đồ cột doanh thu theo ngày"
      role="img"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 12, left: 12 }}
        >
          <CartesianGrid
            stroke="rgba(148, 163, 184, 0.12)"
            strokeDasharray="4 4"
            vertical={false}
          />
          <XAxis
            axisLine={{ stroke: "rgba(148, 163, 184, 0.2)" }}
            dataKey="label"
            height={42}
            interval={data.length > 15 ? 1 : 0}
            label={{
              value: "Ngày",
              position: "insideBottom",
              offset: -3,
              fill: "#64748b",
              fontSize: 11,
            }}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickLine={false}
          />
          <YAxis
            axisLine={false}
            label={{
              value: "Doanh thu",
              angle: -90,
              position: "insideLeft",
              fill: "#64748b",
              fontSize: 11,
            }}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            tickFormatter={(value) => compactFormatter.format(value)}
            tickLine={false}
            width={68}
          />
          <Tooltip
            contentStyle={{
              background: "#151c2e",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.32)",
            }}
            cursor={{ fill: "rgba(139, 92, 246, 0.08)" }}
            formatter={(value) => [
              currencyFormatter.format(Number(value || 0)),
              "Doanh thu",
            ]}
            labelStyle={{ color: "#f1f5f9", fontWeight: 700 }}
            itemStyle={{ color: "#a78bfa" }}
          />
          <Bar
            activeBar={{ fill: "#a78bfa" }}
            dataKey="revenue"
            fill="#8b5cf6"
            maxBarSize={54}
            name="Doanh thu"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RevenueChart;
