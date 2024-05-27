import { json, useActionData, useLoaderData, useNavigate, useNavigation, useParams, useSubmit } from "@remix-run/react"
import { Button, Card, Page, TextField, FormLayout, Select } from "@shopify/polaris"
import { useCallback, useEffect, useState } from "react"
import { STATUS_CODES } from "../helpers/response"
import { createSize, updateSize, getSize } from "../controllers/sizes.controller"
import Loader from "../components/loader"
import { inventorySizes } from "../constants/inventorySizes"

export const loader = async ({ request, params }) => {
    try {
        const sizeId = params.id
        if (!sizeId) {
            return json({ status: "error", message: "InValid sizs ID" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        if (sizeId === 'create') {
            return json({ data: { size: null } }, { status: STATUS_CODES.OK })
        }

        const checkSize = await getSize({ sizeId });
        if (!getSize) {
            return json({ status: "error", message: "Size not found." }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { size: checkSize } }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }
}

export const action = async ({ request, params }) => {
    try {
        const sizeId = params.id

        const formData = await request.formData();
        const size = formData.get('size');
        const meters = formData.get('meters')

        if (!sizeId) {
            return json({ status: "error", message: "InValid sizs ID" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        if (sizeId == 'create') {
            const newSize = await createSize({ size, meters });
            return json({ data: { size: newSize ?? null }, status: 'success', message: "Size created successfully." }, { status: STATUS_CODES.OK })
        }

        const sizeResp = await updateSize({ sizeId, size, meters });

        if (!sizeResp) {
            return json({ status: "error", message: "There is an issue while fetching size" }, { status: STATUS_CODES.BAD_REQUEST })
        }

        return json({ data: { size: sizeResp ?? null }, status: 'success', message: "Update size successfully." }, { status: STATUS_CODES.OK })
    } catch (error) {
        return json({ error: JSON.stringify(error), status: "error", message: "Something went wrong..." }, { status: STATUS_CODES.INTERNAL_SERVER_ERROR });
    }

}

export default function Size() {
    const navigate = useNavigate();
    const submit = useSubmit();
    const nav = useNavigation();
    const loaderData = useLoaderData();
    const actionData = useActionData();
    const { id } = useParams()
    console.log("loaderData", loaderData)
    console.log("actionData", actionData)

    const isPageLoading = ["loading"].includes(nav.state);
    const isSubmitting = ["submitting"].includes(nav.state) && ["POST"].includes(nav.formMethod)

    const iniiState = {
        size: "",
        meters: ""
    }
    const [sizeData, setSizeData] = useState(iniiState)
    const [errors, setErrors] = useState({})

    const handleForm = useCallback((key, value) =>{
        console.log("handleForm")
        setSizeData((prev) => ({
            ...prev,
            [key]: value
        }))
    }, []);


    useEffect(() => {
        if (loaderData?.status === "error") {
            shopify.toast.show(loaderData?.message, { isError: true });
        }
    
        if (loaderData?.data) {
            setSizeData({
                size: loaderData?.data?.size?.size_title || "",
                meters: loaderData?.data?.size?.cloth_meters || ""
            });
        }
    }, [loaderData]);
    
    useEffect(() => {
        if (actionData && actionData?.status?.length) {
            if (actionData?.status === 'error') {
                shopify.toast.show(actionData?.message, { isError: true });
            }

            if (actionData?.status === 'success') {
                shopify.toast.show(actionData?.message, { isError: false });
                if (id == 'create') {
                    navigate(`/app/size/${actionData?.data?.size?.id}`)
                }
            }
        }
    }, [actionData])

    const handleSubmit = () => {

        const validationErrors = validateForm();
        if (Object.keys(validationErrors).length) return

        submit({
            size: sizeData?.size,
            meters: sizeData?.meters
        },
        {
            action: "",
            method: 'post',
            encType: 'multipart/form-data',
            relative: 'route',
        })
    }

    const validateForm = () => {
        let newErrors = {};
        if (sizeData?.size.trim() === "") {
            newErrors.size = "This field is required.";
        }
        if (!sizeData?.meters || sizeData?.meters <= 0 || sizeData?.meters.trim() === "") {
            newErrors.meters = "This field is required";
        }
        setErrors(newErrors);
        return newErrors;
    };

    return (
        <>
            {isPageLoading && (<Loader />)}
            {/* <pre>
                { JSON.stringify(sizeData, null, 4) }
            </pre> */}
            <Page
                title={id == 'create' ? 'Create new size' : 'Update size'}
                primaryAction={
                    <Button
                        loading={isSubmitting}
                        onClick={handleSubmit}
                        variant="primary"
                    >
                        {id == 'create' ? 'Create' : 'Update'}
                    </Button>
                }
                backAction={{ url: "/app/meters-per-size" }}
            >
                <Card>
                    <FormLayout>
                        <Select
                            name="size"
                            label= "size"
                            value={ sizeData?.size }
                            placeholder="Select size"
                            options={ inventorySizes ?? [] }
                            onChange={ (value) => handleForm('size', value) }
                            error={errors?.size ?? ""}
                         />
                        {/* <TextField
                            type="text"
                            name="sizeName"
                            label="Size Name*"
                            helpText="Enter name of SIze"
                            value={sizeData.size}
                            onChange={ (value) => handleForm('size', value) }
                            error={errors?.size ?? ""}
                        /> */}
                        <TextField
                            type="number"
                            name="meters"
                            label="Meters*"
                            helpText="Enter size of cloth in meters"
                            value={sizeData.meters}
                            onChange={ (value) => handleForm('meters', value) }
                            error={errors?.meters ?? ""}
                        />
                    </FormLayout>
                </Card>
            </Page>
        </>
    )
}