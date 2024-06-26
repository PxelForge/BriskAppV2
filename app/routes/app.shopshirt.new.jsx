// @ts-nocheck
import { json, redirect } from "@remix-run/node";
import { Banner, BlockStack, Button, Card, InlineStack, Page, ResourceItem, ResourceList, Text, Thumbnail } from "@shopify/polaris";
import { useEffect, useState } from "react";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";
import {
    useLoaderData,
    useSubmit,
    useNavigation,
    useActionData,
    useNavigate
  } from "@remix-run/react";
import Loader from '../components/loader';
import NotLoggedInScreen from "../components/notLoggedInScreen";
import { loggedInCheck } from "../controllers/users.controller";
import AccessScreen from "../components/accessScreen";
import { STATUS_CODES } from "../helpers/response";

export async function loader({request}) {
    try {
        const { admin, sessionToken } = await authenticate.admin(request);

        if(!admin){
            return json({err: 'Not authenticated'})
        }
    
        const isLoggedIn = await loggedInCheck({ sessionToken })
        if (!isLoggedIn) {
            return json({ status: "NOT_LOGGED_IN", message: "You are not loggedIn." })
        }
    
        const vectorsData = await  prisma.vectors.findMany({
            where: {
                type: "ShopShirt"
            }
        })
    
        console.log('--------vectorsData', vectorsData);
        
        return json(
            {
                data: {
                    vectorsData,
                    scopes: isLoggedIn?.access, 
                    isAdmin: isLoggedIn?.is_admin
                }
            },
            { status: STATUS_CODES.OK }
        )
        
    } catch (error) {
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export async function action({ request }) {
    
    try{
        const formData = await request.formData();
        const productId = formData.get('product');
        const vectors = formData.get('vectors');
    
        if(!productId || !vectors) {
            return json({ status: "error", message: 'Missing product and vectors'})
        };
    
        console.log('--------product', productId, vectors );
        const { session } = await authenticate.admin(request);
        const checkShopShirt = await prisma.shop_shirt.findUnique({
            where: {
                product_id: productId
            }
        })

        if (checkShopShirt) {
            return json({ status: "error", message: "Vectors against this product already exist" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        let createShopshirt = await prisma.shop_shirt.create({
            data: {
                "product_id": productId,
                "vectors_ids": vectors?.split(','),
                "shop": session?.shop
            }
        })
        if (!createShopshirt) {
            return json({ status: "error", message: "There is an issue while creating shopshirt" }, { status: STATUS_CODES.BAD_REQUEST })
        }
        // console.log('-----action res', createShopshirt);
        return redirect(`/app/shopshirt/${ createShopshirt?.id }`)
        // return json({ data: { ...createShopshirt }, status: "success", message: "Shopshirt created success",  success: true, res, action: 'create'}, { status: STATUS_CODES.CREATED });
    }
    catch(error){
        return json({ error: JSON.stringify(error) }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

    
}

export default function ShopShirtNew() {
    const [selectedProducts, setSelectedProducts] = useState([])
    // const [vectorsList, setVectorsList] = useState([])
    const submit = useSubmit();
    const navigate = useNavigate();
    const nav = useNavigation();
    const actionData = useActionData();
    const loaderData = useLoaderData();
    const isLoading = ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";
    const [selectedItems, setSelectedItems] = useState([]);
    const [errors, setErrors] = useState([]);

    console.log('--------loaderData', loaderData);
    console.log('--------actionData', actionData);

    // useEffect(() => {
    //     if (actionData?.success == true && actionData?.res?.id) {
    //         navigate(`/app/shopshirt/${actionData?.res?.id}`);
    //     }

    //     if (actionData?.success == false && actionData?.msg ) {
    //         setErrors([actionData.msg]);
    //         setTimeout(() => {
    //             setErrors([])
    //         }, 5000);
    //     }

    // }, [actionData, navigate])

    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                // navigate(`/app/shopshirt/${actionData?.data?.id}`);
            }
        }
    }, [actionData])
    
    async function selectProduct() {
        const products = await window.shopify.resourcePicker({
            type: "product",
            multiple: false,
            action: "select",
            // query: "tag:BRISK_APP_shop_shirt",
            selectionIds: selectedProducts,
        });

        if (products) {
            console.log(products)
            const allSelectedProducts = products.map(product => {
                const { images, id, variants, title, handle } = product;
                return {
                    id: id,
                    productVariantId: variants[0].id,
                    productTitle: title,
                    productHandle: handle,
                    productAlt: images[0]?.altText,
                    productImage: images[0]?.originalSrc,
                }
            });

            setSelectedProducts(allSelectedProducts);
            console.log(allSelectedProducts)
        }
    }

    // const renderSecondaryActions = () => {
    //     let tempActions = [];
    //     if (selectedProducts.length) {
    //         tempActions.push()
    //     }
    //     return [
    //         { content: 'Update Product', onAction: () => selectProduct() }
    //     ]
    // }

    const saveShopShirt = () => {
        if (!selectedProducts.length) {
            shopify.toast.show("Please select product.", { isError: true });
            return false;
        }
        if(!selectedItems.length) {
            shopify.toast.show("Please select any vector.", { isError: true });
            return false; 
        }
        console.log(selectedItems, selectedItems )
        submit({
            product : selectedProducts[0]?.id,
            vectors : selectedItems
        },
        {
            action: "",
            method: 'post',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    if (loaderData?.status === "NOT_LOGGED_IN") {
        return (
            <>
                { nav.state === 'loading' ? <Loader /> : null }
                <NotLoggedInScreen />
            </>
        )
    }

    if (!loaderData?.data?.isAdmin && !loaderData?.data?.scopes?.includes('write_shopshirt')) {
        return (
            <>
                { nav.state === 'loading' ? <Loader /> : null } 
                <AccessScreen />
            </>
        )
    }

    return (
        <>
            {nav.state === 'loading' ? <Loader/> : null}
            <Page
                title="Add New Shop Shirt"
                backAction={{ url: "../shopshirt" }}
                primaryAction={ <Button loading={isLoading} onClick={saveShopShirt} variant="primary">Save</Button> }
               // secondaryActions={ renderSecondaryActions() }
            >
                {
                    errors.length > 0 ? 
                    <div style={{marginBottom: '15px'}}>
                        <Banner
                            onDismiss={() => {}}
                            title="Errors"
                            // action={{content: 'Review risk analysis'}}
                            tone="critical"
                        >
                            <div>
                                {
                                    errors.map((error) => {
                                        return <Text key={error}>{error}</Text>
                                    })
                                }
                            </div>
                        </Banner>
                    </div>
                    : null
                }
                <BlockStack gap="300">
                {
                    selectedProducts?.length ? selectedProducts.map(item => {
                        let productImage = item?.productImage
                        let productTitle = item?.productTitle
                        let productAlt = item?.productAlt
                        return (
                            <div key={item?.id}>
                                <Card>
                                    <InlineStack align="space-between">
                                        <div>
                                            <InlineStack wrap={false} gap="400" blockAlign='start' margin-left="100px">
                                                <Thumbnail
                                                    source={productImage}
                                                    size="large"
                                                    alt={ productAlt }
                                                />
                                                <div>
                                                    <Text variant="bodyMd" fontWeight="bold" as="h1">
                                                        { productTitle }
                                                    </Text>
                                                </div>
                                                
                                            </InlineStack>
                                        </div>
                                        <div>
                                            <Button onClick={selectProduct}>Change Product</Button>
                                        </div>
                                    </InlineStack>
                                </Card>
                            </div>
                        ) 
                    }) : (
                        <Card>
                            <h1>No product Selected</h1> 
                            <Button onClick={() => selectProduct()}>Select product</Button>
                        </Card>
                    )
                }
                {
                    <Card>
                        {/* <div style={{ marginBottom: '20px' }}>
                            <Autocomplete
                                allowMultiple
                                options={list}
                                selected={[]}
                                textField={<Autocomplete.TextField
                                    label="Shop Shirt Vecotrs"
                                    placeholder="Select shop shirt vecotrs"
                                    autoComplete="off"
                                />}
                                onSelect={ () => alert('Select item')}
                                listTitle="Suggested Tags"
                            />
                        </div> */}
                        <ResourceList
                            resourceName={{ singular: "Vector", plural: "Vectors" }}
                            selectable
                            items={loaderData?.data?.vectorsData}
                            selectedItems={selectedItems}
                            // @ts-ignore
                            onSelectionChange={setSelectedItems}
                            renderItem={(item) => {
                                const { id, title,img_cdn, title_english, title_urdu, value_urdu, value_english } = item;
                                const media = <Thumbnail
                                    source={img_cdn}
                                    size="small"
                                    alt={ title }
                                />
                                // const shortcutActions = [
                                //     {
                                //         content: "Delete",
                                //         accessibilityLabel: `View ${title}’s latest order`,
                                //     }
                                // ]

                                return (
                                    // @ts-ignore
                                    <ResourceItem
                                        id={id}
                                        media={media}
                                        accessibilityLabel={`View details for ${title}`}
                                        //shortcutActions={shortcutActions}
                                        persistActions
                                    >
                                        <Text variant="bodyMd" fontWeight="bold" as="p">
                                            <InlineStack>
                                                {title_english} : 
                                                <div style={{marginLeft:'15px'}}>
                                                    {value_english}
                                                </div>
                                            </InlineStack>
                                            <InlineStack>
                                                {value_urdu} : 
                                                <div style={{marginLeft:'15px'}}>
                                                    {title_urdu}
                                                </div>
                                            </InlineStack>
                                        </Text>
                                        {/* <div>{value}</div> */}
                                    </ResourceItem>
                                );
                            }}
                        />
                    </Card>
                }
                </BlockStack>
                {/* {
                    (!selectedProducts.length && !vectorsList.length) ? (
                        <Card>
                            <div style={{ paddingTop: "50px" }}>
                                <EmptyState
                                    heading="Add Shop shirt product"
                                    action={{content: 'Add product', onAction: () => selectProduct()}}
                                    image=""
                                >
                                    <p>Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printe.</p>
                                </EmptyState>
                            </div>
                        </Card>
                    ) : (
                            selectedProducts?.length ? selectedProducts.map(item => {
                                let productImage = item?.productImage
                                let productTitle = item?.productTitle
                                let productAlt = item?.productAlt
                                return (
                                    <>
                                        <Card>
                                            <div>
                                                <InlineStack wrap={false} gap="400" blockAlign='start' margin-left="100px">
                                                    <Thumbnail
                                                        source={productImage}
                                                        size="large"
                                                        alt={ productAlt }
                                                    />
                                                    <div>
                                                        <Text variant="bodyMd" fontWeight="bold" as="h1">
                                                            { productTitle }
                                                        </Text>
                                                        <Text as="p">
                                                            $100.00
                                                        </Text>
                                                    </div>
                                                    <div style={{ marginLeft: 'auto' }}>
                                                        <Button variant="primary" onClick={ () => removeProduct() }>Remove</Button>
                                                    </div>
                                                </InlineStack>
                                            </div>
                                        </Card>
                                    </>
                                ) 
                            }) : (
                                <h1>No product Selected</h1>
                            )
                    )
                } */}
                
            </Page>
        </>
    )
}