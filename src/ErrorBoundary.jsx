import React from 'react';

export class ErrorBoundary extends React.Component {
  state = {error:false};
  static getDerivedStateFromError(){ return {error:true}; }
  componentDidCatch(error, info){
    if (import.meta.env.DEV) console.error('Storefront render error', error, info);
  }
  render(){
    if(this.state.error) return <main className="fatal-error"><h1>We couldn’t load the store.</h1><p>Your cart is safe. Refresh the page to try again.</p><button onClick={()=>location.reload()}>Refresh store</button></main>;
    return this.props.children;
  }
}
