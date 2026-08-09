export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  if (isNaN(num) || !isFinite(num)) return '';

  const a = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' : '');
      str += a[n % 10];
    } else {
      str += a[n];
    }
    return str;
  };

  const convert = (n: number): string => {
    if (n < 0) return 'Negative ' + convert(Math.abs(n));
    if (n === 0) return '';
    
    let res = '';
    
    // Crores
    if (Math.floor(n / 10000000) > 0) {
      res += convert(Math.floor(n / 10000000)) + ' Crore ';
      n %= 10000000;
    }
    
    // Lacs
    if (Math.floor(n / 100000) > 0) {
      res += convert(Math.floor(n / 100000)) + ' Lac ';
      n %= 100000;
    }
    
    // Thousands
    if (Math.floor(n / 1000) > 0) {
      res += convert(Math.floor(n / 1000)) + ' Thousand ';
      n %= 1000;
    }
    
    // Hundreds
    if (Math.floor(n / 100) > 0) {
      res += convert(Math.floor(n / 100)) + ' Hundred ';
      n %= 100;
    }
    
    // Tens and Ones
    if (n > 0) {
      if (res !== '') res += ' ';
      res += inWords(n);
    }
    
    return res.trim();
  };

  return convert(num);
}
