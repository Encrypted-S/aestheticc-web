import { Switch, Route } from "wouter";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";

function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
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