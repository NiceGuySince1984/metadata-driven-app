import { migrate } from './db/migrate';
import { seed } from './db/seed';
import app from './app';

const PORT = process.env.PORT || 3001;

migrate();
seed();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
