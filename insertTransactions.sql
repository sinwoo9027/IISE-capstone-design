-- 아파트별 거래 데이터 삽입 (최근 12개월)
-- 각 아파트마다 12개의 거래 기록 생성

INSERT INTO transactions (apt_id, contract_date, price_krw, area_m2, created_at) 
SELECT 
    a.id as apt_id,
    DATE_SUB(CURDATE(), INTERVAL m.month MONTH) as contract_date,
    CAST(
        CASE 
            WHEN a.id % 3 = 0 THEN 1200000000 * (0.92 + RAND() * 0.16)
            WHEN a.id % 3 = 1 THEN 900000000 * (0.92 + RAND() * 0.16)
            ELSE 700000000 * (0.92 + RAND() * 0.16)
        END AS UNSIGNED
    ) as price_krw,
    CASE 
        WHEN RAND() < 0.2 THEN 49.95
        WHEN RAND() < 0.4 THEN 59.94
        WHEN RAND() < 0.6 THEN 69.93
        WHEN RAND() < 0.8 THEN 74.85
        ELSE 84.95
    END as area_m2,
    NOW() as created_at
FROM apartments a
CROSS JOIN (
    SELECT 0 as month UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11
) m;
