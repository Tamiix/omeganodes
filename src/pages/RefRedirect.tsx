import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

const RefRedirect = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (code) {
      localStorage.setItem('referral_code', code);
    }
    navigate('/#pricing', { replace: true });
  }, [code, navigate]);

  return null;
};

export default RefRedirect;
