import {rm} from 'node:fs/promises';
import {resolve} from 'node:path';
import {defineConfig} from 'vite';

export default defineConfig({
  base:'./',
  plugins:[{
    name:'omit-standalone-report-files',
    async writeBundle(output) {
      await rm(resolve(output.dir,'data'),{recursive:true,force:true});
    },
  }],
});
