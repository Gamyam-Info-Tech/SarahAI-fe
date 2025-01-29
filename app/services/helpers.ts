// export const Apiurl = "http://216.48.179.15:8000";
export const Apiurl = "http://172.16.4.129:8000";


const getHeaders:any = () => {
  const token=localStorage.getItem("sara_token")
  if(token){
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("sara_token")}`,
  };}else{
    return {
      "Content-Type": "application/json",
   
    }
  }
};

export const apiGetService = async (uri:string, params:any) => {
  const queryString = new URLSearchParams(params).toString();
  let url = `${Apiurl}${uri}`;
  if (queryString) {
    url = `${url}?${queryString}`;
  }
  try { 1
    const response = await fetch(url, { headers: getHeaders() });
    if (!response.ok) {
      const error = await response.json();
      const errorMessage = Object.values(error).flat().join(", ");
      throw new Error(errorMessage || "An error occurred");
    }
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/csv')) {
      return await response.blob();
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};



export const apiPostService = async (
  uri = "",
  payload = {},
  responseType = "json",
 
) => {
  try {
    const response = await fetch(`${Apiurl}${uri}`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(payload),
    });

    // if (!response.ok) {
    //     const error = await response.json();
        if (!response.ok) {
            const resError = await response.json();
            let jsonError=""
            if(typeof(resError)==="object"){
              console.log("resError","hello",resError)
              jsonError= JSON.stringify(resError)
            }else{
              jsonError=resError
            }
            if (jsonError) {
              throw new Error(jsonError);
            }
          }
    //   throw new Error(error);
    // }

    // Handle the response based on the specified responseType
  
      return await response.json();
    
  } catch (error) {
    console.log("API Post Service Error:", error);
    throw error;
  }
};

export const apiPutService = async (uri:any, jsonPayload:any) => {
  try {
    const response = await fetch(`${Apiurl}${uri}`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify(jsonPayload),
    });
    if (!response.ok) {
      const error = await response.json();
      const errorMessage = Object.values(error).flat().join(", ");
      throw new Error(errorMessage || "An error occurred");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const apiPatchService = async (uri:any, jsonPayload:any) => {
  try {
    const response = await fetch(`${Apiurl}${uri}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(jsonPayload),
    });
    if (!response.ok) {
      const error = await response.json();
      const errorMessage = Object.values(error).flat().join(", ");
      throw new Error(errorMessage || "An error occurred");
    }
    return await response.json();
  } catch (error) {
    throw error;
  }
};

export const apiDeleteService = async (uri:any) => {
  try {
    const response = await fetch(`${Apiurl}${uri}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    // if (!response.ok) {
    //    const error= await response.json();
    //    const errorMessage = Object.values(error).flat().join(', ');
    //    throw new Error('An error occurred');
    // }
    // return await response.json();
    return true;
  } catch (error) {
    throw error;
  }
};
