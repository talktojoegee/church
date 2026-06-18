export type PayslipBreakdownLine = {
  name: string;
  type: string;
  amount: number;
  isPercentage?: boolean;
  source?: string;
};

export type PayslipEmployee = {
  firstName: string;
  lastName: string;
  employeeNumber: string;
  position?: string | null;
  department?: string | null;
  email?: string | null;
  phone?: string | null;
  employmentType?: string | null;
  hireDate?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankAccountName?: string | null;
  branch?: { name?: string | null } | null;
};

export type PayslipPayRun = {
  title: string;
  period: string;
  status?: string | null;
  runDate?: string | null;
};

export type PayslipPrintData = {
  payslip: {
    baseSalary: number;
    totalAllowances: number;
    totalDeductions: number;
    grossPay: number;
    netPay: number;
    breakdown?: PayslipBreakdownLine[] | null;
  };
  employee: PayslipEmployee;
  payRun: PayslipPayRun;
};
