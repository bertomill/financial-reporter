import React from 'react';
import Login from '../components/Login';
import Head from 'next/head';

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>Login - Financial Reporter</title>
        <meta name="description" content="Login to your Financial Reporter account" />
      </Head>
      <Login />
    </>
  );
} 