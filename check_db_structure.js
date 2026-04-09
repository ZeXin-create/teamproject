const { createClient } = require('@supabase/supabase-js');

// 创建 Supabase 客户端
const supabaseUrl = 'https://adfotpklgxiqmwrhzveh.supabase.co';
const supabaseKey = 'sb_publishable_j03ltzP6-5Ts2mcuywD3Yg_w_57-wA3';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabaseStructure() {
  try {
    // 查询 team_applications 表的字段名
    console.log('Checking team_applications table columns...');
    
    // 查询表的所有字段
    const { data: columns, error: columnsError } = await supabase
      .from('team_applications')
      .select('*')
      .limit(1);

    if (columnsError) {
      console.error('Error querying columns:', columnsError);
    } else if (columns && columns.length > 0) {
      console.log('Table columns:', Object.keys(columns[0]));
    }

    // 查询一些示例数据
    console.log('\nSample data from team_applications:');
    const { data: sampleData, error: sampleError } = await supabase
      .from('team_applications')
      .select('*')
      .limit(5);

    if (sampleError) {
      console.error('Error querying sample data:', sampleError);
    } else {
      console.log('Total records:', sampleData.length);
      if (sampleData.length > 0) {
        console.log('First record keys:', Object.keys(sampleData[0]));
        console.log('First record values:', sampleData[0]);
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

checkDatabaseStructure();
