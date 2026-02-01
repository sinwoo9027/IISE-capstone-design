import * as cron from 'node-cron';
import { fetchAndSaveWeeklyTransactions } from './fetchTransactions';

// 매주 일요일 오전 2시에 실행 (크론 표현식: '0 2 * * 0')
cron.schedule('0 2 * * 0', async () => {
  console.log('Running weekly transaction data fetch...');
  try {
    await fetchAndSaveWeeklyTransactions();
    console.log('Weekly fetch completed successfully');
  } catch (error) {
    console.error('Error in weekly fetch:', error);
  }
});

console.log('Transaction data scheduler started - runs every Sunday at 2 AM');

// 개발 환경에서 즉시 실행 (테스트용)
// if (process.env.NODE_ENV === 'development') {
//   fetchAndSaveWeeklyTransactions();
// }