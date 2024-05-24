import { json } from "@remix-run/node";
import { Form, Link, Outlet, useLoaderData, useRouteError, useSubmit } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { authenticate } from "../shopify.server";
import { loggedInCheckRedirect } from "../helpers/session.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  const isLogedIn = await loggedInCheckRedirect(request, false)

  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", isLogedIn: isLogedIn });
};

export default function App() {
  const { apiKey, isLogedIn } = useLoaderData();
  const submit = useSubmit();

  const logoutHandle = () => {
    submit({
      logout: ""
    }, {
      action: "/app/logout",
      method: "post",
      encType: "multipart/form-data",
    });
  }


  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        {/* { isLogedIn && (
          <> */}
            {/* <Link to="/app" rel="home">Home</Link> */}
            <Link to="/app">Orders</Link>
            <Link to="/app/vectors">Settings</Link>
          {/* </>
        ) } */}
      </NavMenu>
      {
        isLogedIn && (
          <ui-title-bar title="Brisk App">
            {/* <button variant="primary">
              Generate a product
            </button> */}
            {/* <Form method="post" action="/app/logout"> */}
            <button variant="primary" onClick={logoutHandle}>Logout</button>
            {/* </Form> */}
          </ui-title-bar>
        )
      }
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
