import React, { useEffect, useState } from 'react';
import { wordpressApi } from '../api/axiosClient';

export default function TestAuth() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState('');

  const testToken = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    
    if (tokenFromUrl) {
      setToken(tokenFromUrl);
      
      try {
        // Test our validate endpoint
        console.log('Testing token validation...');
        const validateResponse = await wordpressApi.post('/wp-json/jwt-auth/v1/token/validate', {
          token: tokenFromUrl
        });
        console.log('Validate response:', validateResponse.data);

        if (validateResponse.data.valid) {
          // Try to get user info
          console.log('Token is valid, getting user info...');
          const userResponse = await wordpressApi.get('/wp-json/wp/v2/users/me', {
            headers: {
              'Authorization': `Bearer ${tokenFromUrl}`
            }
          });
          console.log('User response:', userResponse.data);
          setResult(`Success! User: ${userResponse.data.name} (${userResponse.data.email})`);
        } else {
          setResult('Token validation failed');
        }
      } catch (error) {
        console.error('Error:', error);
        setResult(`Error: ${error.message}`);
      }
    } else {
      setResult('No token found in URL');
    }
  };

  useEffect(() => {
    testToken();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Authentication Test</h1>
      
      <div className="mb-4">
        <p className="mb-2"><strong>Token:</strong> {token.substring(0, 50)}...</p>
        <p className="mb-2"><strong>Result:</strong> {result}</p>
      </div>
      
      <button 
        onClick={testToken}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Test Again
      </button>
    </div>
  );
}
