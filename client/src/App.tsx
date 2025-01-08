import { Switch, Route } from "wouter";
import Layout from "@/components/Layout";

function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <h1 className="text-3xl font-bold">Welcome to Aesthetic Clinic CMS</h1>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

export default App;