export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  badge: string;
  rows: Record<string, any>[];
}

export const SAMPLES: SampleDataset[] = [
  {
    id: 'sample-saas',
    name: 'SaaS Recurring Revenue & Subscriptions',
    description: 'B2B subscription metrics across customer tiers, MRR, churn, and geographic regions.',
    badge: 'SaaS Finance',
    rows: [
      { date: '2024-01-01', tier: 'Enterprise', mrr: 45000, new_users: 120, churn_rate: 1.2, region: 'North America' },
      { date: '2024-01-08', tier: 'Pro', mrr: 28000, new_users: 310, churn_rate: 2.1, region: 'Europe' },
      { date: '2024-01-15', tier: 'Starter', mrr: 12500, new_users: 850, churn_rate: 4.5, region: 'Asia Pacific' },
      { date: '2024-01-22', tier: 'Enterprise', mrr: 52000, new_users: 140, churn_rate: 0.9, region: 'North America' },
      { date: '2024-01-29', tier: 'Pro', mrr: 31500, new_users: 340, churn_rate: 1.8, region: 'Latin America' },
      { date: '2024-02-05', tier: 'Starter', mrr: 14200, new_users: 920, churn_rate: 3.8, region: 'Europe' },
      { date: '2024-02-12', tier: 'Enterprise', mrr: 61000, new_users: 180, churn_rate: 0.8, region: 'North America' },
      { date: '2024-02-19', tier: 'Pro', mrr: 35000, new_users: 390, churn_rate: 1.9, region: 'Asia Pacific' },
      { date: '2024-02-26', tier: 'Starter', mrr: 16800, new_users: 1040, churn_rate: 4.1, region: 'Europe' },
      { date: '2024-03-04', tier: 'Enterprise', mrr: 68500, new_users: 210, churn_rate: 0.7, region: 'North America' },
      { date: '2024-03-11', tier: 'Pro', mrr: 39200, new_users: 430, churn_rate: 1.6, region: 'Europe' },
      { date: '2024-03-18', tier: 'Starter', mrr: 18900, new_users: 1150, churn_rate: 3.5, region: 'Asia Pacific' },
      { date: '2024-03-25', tier: 'Enterprise', mrr: 74000, new_users: 240, churn_rate: 0.6, region: 'North America' },
      { date: '2024-04-01', tier: 'Pro', mrr: 42000, new_users: 480, churn_rate: 1.4, region: 'Latin America' },
      { date: '2024-04-08', tier: 'Starter', mrr: 21500, new_users: 1290, churn_rate: 3.2, region: 'Europe' },
    ],
  },
  {
    id: 'sample-ecommerce',
    name: 'Global E-Commerce Sales & Orders',
    description: 'Multi-category retail transactions tracking order value, category share, and delivery status.',
    badge: 'Retail Analytics',
    rows: [
      { order_date: '2024-01-05', category: 'Electronics', amount: 1299.99, units: 1, region: 'California', status: 'Completed' },
      { order_date: '2024-01-08', category: 'Home & Kitchen', amount: 245.50, units: 3, region: 'New York', status: 'Completed' },
      { order_date: '2024-01-12', category: 'Apparel', amount: 89.00, units: 2, region: 'Texas', status: 'Refunded' },
      { order_date: '2024-01-18', category: 'Electronics', amount: 849.00, units: 1, region: 'Florida', status: 'Completed' },
      { order_date: '2024-01-24', category: 'Books & Media', amount: 45.20, units: 4, region: 'California', status: 'Completed' },
      { order_date: '2024-01-30', category: 'Home & Kitchen', amount: 420.00, units: 2, region: 'Illinois', status: 'Completed' },
      { order_date: '2024-02-04', category: 'Electronics', amount: 2100.00, units: 2, region: 'New York', status: 'Completed' },
      { order_date: '2024-02-10', category: 'Apparel', amount: 165.00, units: 3, region: 'California', status: 'Completed' },
      { order_date: '2024-02-16', category: 'Home & Kitchen', amount: 310.00, units: 1, region: 'Texas', status: 'Completed' },
      { order_date: '2024-02-22', category: 'Books & Media', amount: 72.50, units: 5, region: 'Florida', status: 'Completed' },
      { order_date: '2024-02-28', category: 'Electronics', amount: 1450.00, units: 1, region: 'New York', status: 'Pending' },
      { order_date: '2024-03-05', category: 'Apparel', amount: 240.00, units: 4, region: 'California', status: 'Completed' },
    ],
  },
  {
    id: 'sample-hr',
    name: 'Tech Workforce Demographics & Salaries',
    description: 'Departmental compensation distribution, performance ratings, and tenure metrics.',
    badge: 'People Analytics',
    rows: [
      { department: 'Engineering', salary: 145000, performance_score: 4.8, tenure_years: 3.5, location: 'Remote' },
      { department: 'Product Design', salary: 115000, performance_score: 4.5, tenure_years: 2.1, location: 'San Francisco' },
      { department: 'Sales', salary: 98000, performance_score: 4.2, tenure_years: 1.8, location: 'New York' },
      { department: 'Engineering', salary: 168000, performance_score: 4.9, tenure_years: 5.2, location: 'Remote' },
      { department: 'Marketing', salary: 88000, performance_score: 3.9, tenure_years: 1.2, location: 'London' },
      { department: 'Customer Success', salary: 72000, performance_score: 4.4, tenure_years: 2.0, location: 'Remote' },
      { department: 'Engineering', salary: 132000, performance_score: 4.3, tenure_years: 2.8, location: 'Austin' },
      { department: 'Sales', salary: 124000, performance_score: 4.6, tenure_years: 3.1, location: 'New York' },
      { department: 'Product Design', salary: 128000, performance_score: 4.7, tenure_years: 4.0, location: 'San Francisco' },
      { department: 'Marketing', salary: 95000, performance_score: 4.1, tenure_years: 2.5, location: 'Remote' },
    ],
  },
];
