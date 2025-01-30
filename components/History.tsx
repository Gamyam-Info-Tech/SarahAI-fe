import { historyUser } from '../app/services/users';
import React, { useEffect, useState } from 'react';

interface HistoryData {
  id: number;
}

const History = () => {
  const [historyData, setHistoryData] = useState<HistoryData[]>([]);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response:any = await historyUser({});
        console.log('History Data:', response);
        setHistoryData(response.data || []);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to fetch history data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>{error}</div>;
  }

  return (
    <div>
      {historyData.map((item) => (
        <div key={item.id}>
        </div>
      ))}
    </div>
  );
};

export default History;