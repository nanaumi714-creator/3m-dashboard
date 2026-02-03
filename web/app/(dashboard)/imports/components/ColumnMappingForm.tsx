"use client";

interface ColumnMappingFormProps {
    headers: string[];
    dateColumn: string;
    amountColumn: string;
    descriptionColumn: string;
    selectedPaymentMethod: string;
    paymentMethods: { id: string; name: string }[];
    onDateColumnChange: (value: string) => void;
    onAmountColumnChange: (value: string) => void;
    onDescriptionColumnChange: (value: string) => void;
    onPaymentMethodChange: (value: string) => void;
}

const REQUIRED_HEADERS = {
    date: "利用日",
    amount: "利用金額",
    description: "利用店舗",
};

export function ColumnMappingForm({
    headers,
    dateColumn,
    amountColumn,
    descriptionColumn,
    selectedPaymentMethod,
    paymentMethods,
    onDateColumnChange,
    onAmountColumnChange,
    onDescriptionColumnChange,
    onPaymentMethodChange,
}: ColumnMappingFormProps) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 ml-1">日付列</label>
                    <select
                        value={dateColumn}
                        onChange={(e) => onDateColumnChange(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                        <option value="">選択してください</option>
                        {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                    <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.date}</p>
                </div>
                <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 ml-1">金額列</label>
                    <select
                        value={amountColumn}
                        onChange={(e) => onAmountColumnChange(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                        <option value="">選択してください</option>
                        {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                    <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.amount}</p>
                </div>
                <div>
                    <label className="block text-sm font-black text-gray-700 mb-2 ml-1">摘要/店舗列</label>
                    <select
                        value={descriptionColumn}
                        onChange={(e) => onDescriptionColumnChange(e.target.value)}
                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
                    >
                        <option value="">選択してください</option>
                        {headers.map((h) => (
                            <option key={h} value={h}>{h}</option>
                        ))}
                    </select>
                    <p className="text-[10px] font-bold text-blue-500 mt-2 ml-1 uppercase tracking-wider">推奨: {REQUIRED_HEADERS.description}</p>
                </div>
            </div>

            <div>
                <label className="block text-sm font-black text-gray-700 mb-2 ml-1">一括設定する支払い手段</label>
                <select
                    value={selectedPaymentMethod}
                    onChange={(e) => onPaymentMethodChange(e.target.value)}
                    className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-700 appearance-none cursor-pointer"
                >
                    <option value="">選択してください</option>
                    {paymentMethods.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}
